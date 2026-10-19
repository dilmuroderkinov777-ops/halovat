"""Check native ELF alignment and accidental private-key packaging in APK/AAB."""
import struct
import sys
import zipfile

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
