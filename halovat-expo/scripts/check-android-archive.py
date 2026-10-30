"""Check native alignment, signing material and Room startup in APK/AAB."""
import struct
import sys
import zipfile


def has_startup_constructor(dex, descriptor):
    """Return None for an absent class, otherwise check its public no-arg ctor."""
    assert dex[:4] == b'dex\n', 'Invalid DEX file'

    def uint(offset):
        return struct.unpack_from('<I', dex, offset)[0]

    def uleb(offset):
        value, shift = 0, 0
        while True:
            byte = dex[offset]
            offset += 1
            value |= (byte & 127) << shift
            if byte < 128:
                return value, offset
            shift += 7

    strings_offset, types_offset = uint(60), uint(68)
    protos_offset, methods_offset = uint(76), uint(92)

    def string(index):
        _, offset = uleb(uint(strings_offset + index * 4))
        return dex[offset:dex.index(0, offset)].decode('utf-8', errors='replace')

    for index in range(uint(96)):
        entry = uint(100) + index * 32
        if string(uint(types_offset + uint(entry) * 4)) != descriptor:
            continue
        if uint(entry + 4) & 0x400:  # An abstract class cannot be instantiated.
            return False
        offset = uint(entry + 24)
        if not offset:
            return False
        counts = []
        for _ in range(4):
            count, offset = uleb(offset)
            counts.append(count)
        for _ in range(counts[0] + counts[1]):
            _, offset = uleb(offset)
            _, offset = uleb(offset)
        for count in counts[2:]:
            method_index = 0
            for _ in range(count):
                diff, offset = uleb(offset)
                method_index += diff
                access, offset = uleb(offset)
                code, offset = uleb(offset)
                method = methods_offset + method_index * 8
                if string(uint(method + 4)) != '<init>':
                    continue
                proto = struct.unpack_from('<H', dex, method + 2)[0]
                parameters = uint(protos_offset + proto * 12 + 8)
                if access & 1 and code and (not parameters or uint(parameters) == 0):
                    return True
        return False
    return None


with zipfile.ZipFile(sys.argv[1]) as archive:
    names = archive.namelist()
    forbidden = [name for name in names if name.lower().endswith(('.jks', '.keystore', '/credentials.json'))]
    assert not forbidden, f'Private signing material packaged: {forbidden}'
    libraries = [name for name in names if name.endswith('.so')]
    assert libraries, 'No native libraries found'
    for name in libraries:
        elf = archive.read(name)
        assert elf[:4] == b'\x7fELF' and elf[4] == 2, f'Expected 64-bit ELF: {name}'
        endian = '<' if elf[5] == 1 else '>'
        offset = struct.unpack_from(endian + 'Q', elf, 32)[0]
        size, count = struct.unpack_from(endian + 'HH', elf, 54)
        for index in range(count):
            header = offset + size * index
            if struct.unpack_from(endian + 'I', elf, header)[0] == 1:  # PT_LOAD
                alignment = struct.unpack_from(endian + 'Q', elf, header + 48)[0]
                assert alignment >= 16384, f'Unaligned LOAD segment: {name} ({alignment})'
    print(f'PASS: {len(libraries)} native libraries have >=16 KB ELF LOAD alignment; no signing keys packaged.')
    # WorkManager initializes before the first Activity. R8 can keep this class
    # while deleting the constructor that Room invokes via Class.newInstance().
    matches = []
    for name in names:
        if name.endswith('.dex'):
            result = has_startup_constructor(archive.read(name), 'Landroidx/work/impl/WorkDatabase_Impl;')
            if result is not None:
                matches.append(result)
    assert matches == [True], 'Room startup is broken: WorkDatabase_Impl must retain its public no-arg constructor'
    print('PASS: WorkDatabase_Impl retains the public no-arg constructor used at startup.')
