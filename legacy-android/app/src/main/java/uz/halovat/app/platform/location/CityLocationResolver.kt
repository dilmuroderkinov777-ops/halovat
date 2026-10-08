package uz.halovat.app.platform.location

import android.content.Context
import android.location.Geocoder
import android.location.Location
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.withContext
import java.text.Normalizer
import java.util.Locale

data class DetectedCity(
    val name: String,
    val slug: String,
    val latitude: Double,
    val longitude: Double,
    val timeZoneId: String,
)

data class CityLocationOption(val name: String, val slug: String, val latitude: Double, val longitude: Double)

object CityLocationResolver {
    suspend fun detect(context: Context): DetectedCity = withContext(Dispatchers.IO) {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val location = try {
            withTimeoutOrNull(10_000) {
                client.getCurrentLocation(Priority.PRIORITY_BALANCED_POWER_ACCURACY, CancellationTokenSource().token).await()
            } ?: withTimeoutOrNull(2_000) { client.lastLocation.await() }
        } catch (error: SecurityException) {
            throw IllegalStateException("Joylashuv ruxsati berilmagan", error)
        } ?: throw IllegalStateException("Joylashuv aniqlanmadi. GPS yoki internetni yoqing.")

        val address = withTimeoutOrNull(8_000) { reverseGeocode(context, location) }
        val candidates = listOfNotNull(
            address?.locality,
            address?.subAdminArea,
            address?.adminArea,
            address?.subLocality,
            address?.featureName,
        ).filter(String::isNotBlank)
        val geocodedSlug = candidates.firstNotNullOfOrNull(::supportedSlug)
        val nearestCity = geocodedSlug?.let { slug ->
            optionForSlug(slug) ?: CityLocationOption(canonicalName(slug), slug, location.latitude, location.longitude)
        } ?: nearestUzbekCity(location.latitude, location.longitude)
        if (nearestCity != null) {
            DetectedCity(nearestCity.name, nearestCity.slug, location.latitude, location.longitude, "Asia/Tashkent")
        } else {
            val placeName = candidates.firstOrNull() ?: "Joylashuv"
            DetectedCity(placeName, "", location.latitude, location.longitude, java.time.ZoneId.systemDefault().id)
        }
    }

    @Suppress("DEPRECATION")
    private fun reverseGeocode(context: Context, location: Location) = runCatching {
        if (Geocoder.isPresent()) Geocoder(context, Locale.forLanguageTag("uz")).getFromLocation(location.latitude, location.longitude, 1)?.firstOrNull()
        else null
    }.getOrNull()

    private fun supportedSlug(value: String): String? {
        val normalized = normalize(value)
            .replace(Regex("\\b(shahri|shahar|viloyati|viloyat|region|province|city|tumani|tuman|district)\\b"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()
        val aliases = mapOf(
            "tashkent" to "toshkent", "toshkent city" to "toshkent",
            "samarkand" to "samarqand", "fergana" to "fargona", "ferghana" to "fargona",
            "kokand" to "qoqon", "bukhara" to "buxoro", "navoi" to "navoiy",
            "jizzakh" to "jizzax", "karshi" to "qarshi", "termez" to "termiz",
            "urgench" to "urganch", "khiva" to "xiva", "nukus city" to "nukus",
            "margilan" to "margilon", "angren city" to "angren", "gulistan" to "guliston",
            "namangan city" to "namangan", "andijan" to "andijon",
        )
        val candidate = aliases[normalized] ?: normalized.replace(" ", "")
        return candidate.takeIf { it in SUPPORTED_SLUGS }
    }

    private fun normalize(value: String): String = Normalizer.normalize(value.lowercase(Locale.ROOT), Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .replace('ʻ', ' ').replace('ʼ', ' ').replace('’', ' ').replace('`', ' ').replace('\'', ' ')
        .replace(Regex("[^a-z0-9\\s-]"), " ")
        .replace(Regex("\\s+"), " ").trim()

    private fun canonicalName(slug: String): String = when (slug) {
        "toshkent" -> "Toshkent"
        "andijon" -> "Andijon"
        "fargona" -> "Farg‘ona"
        "samarqand" -> "Samarqand"
        "buxoro" -> "Buxoro"
        "namangan" -> "Namangan"
        "navoiy" -> "Navoiy"
        "qarshi" -> "Qarshi"
        "termiz" -> "Termiz"
        "urganch" -> "Urganch"
        "nukus" -> "Nukus"
        "jizzax" -> "Jizzax"
        "guliston" -> "Guliston"
        "qoqon" -> "Qo‘qon"
        "margilon" -> "Marg‘ilon"
        else -> slug.replaceFirstChar { it.uppercase(Locale.forLanguageTag("uz")) }
    }

    private fun optionForSlug(slug: String): CityLocationOption? = cityOptions.firstOrNull { it.slug == slug }

    private fun nearestUzbekCity(latitude: Double, longitude: Double): CityLocationOption? {
        if (latitude !in 36.5..46.7 || longitude !in 55.8..73.2) return null
        return cityOptions.minByOrNull { city -> distanceKm(latitude, longitude, city.latitude, city.longitude) }
    }

    private fun distanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val earthKm = 6_371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = kotlin.math.sin(dLat / 2) * kotlin.math.sin(dLat / 2) +
            kotlin.math.cos(Math.toRadians(lat1)) * kotlin.math.cos(Math.toRadians(lat2)) *
            kotlin.math.sin(dLon / 2) * kotlin.math.sin(dLon / 2)
        return 2 * earthKm * kotlin.math.asin(kotlin.math.sqrt(a))
    }

    val cityOptions = listOf(
        CityLocationOption("Toshkent", "toshkent", 41.3111, 69.2797),
        CityLocationOption("Andijon", "andijon", 40.7821, 72.3442),
        CityLocationOption("Farg‘ona", "fargona", 40.3864, 71.7864),
        CityLocationOption("Samarqand", "samarqand", 39.6542, 66.9597),
        CityLocationOption("Qo‘qon", "qoqon", 40.5286, 70.9425),
        CityLocationOption("Buxoro", "buxoro", 39.7678, 64.4550),
        CityLocationOption("Jizzax", "jizzax", 40.1158, 67.8422),
        CityLocationOption("Qarshi", "qarshi", 38.8606, 65.7890),
        CityLocationOption("Navoiy", "navoiy", 40.0844, 65.3792),
        CityLocationOption("Namangan", "namangan", 40.9983, 71.6726),
        CityLocationOption("Nukus", "nukus", 42.4619, 59.6166),
        CityLocationOption("Termiz", "termiz", 37.2242, 67.2783),
        CityLocationOption("Urganch", "urganch", 41.5500, 60.6333),
        CityLocationOption("Guliston", "guliston", 40.4897, 68.7842),
        CityLocationOption("Marg‘ilon", "margilon", 40.4711, 71.7246),
        CityLocationOption("Angren", "angren", 41.0169, 70.1436),
    )

    private val SUPPORTED_SLUGS = setOf(
        "toshkent", "andijon", "fargona", "samarqand", "qoqon", "gazli", "gijduvon", "qorakol",
        "guliston", "sardoba", "jizzax", "zomin", "forish", "gallaorol", "navoiy", "zarafshon",
        "konimex", "nurota", "uchquduq", "nukus", "moynoq", "taxtakopir", "tortkol", "qongirot",
        "margilon", "ishtixon", "mirbozor", "kattaqorgon", "urgut", "termiz", "boysun", "denov",
        "sherobod", "shorchi", "qarshi", "dehqonobod", "muborak", "shahrisabz", "guzor", "angren",
        "piskent", "bekobod", "buxoro", "xonobod", "shahrixon", "xojaobod", "namangan", "chortoq",
        "chust", "quva", "rishton", "parkent", "gazalkent", "sirdaryo", "boyovut", "paxtaobod",
        "jondor", "dostlik", "pop1", "uchqorgon", "bogdod", "oltiariq", "asaka", "marhamat",
        "paytug", "olmaliq", "boka", "yangiyol", "nurafshon", "urganch", "hazorasp", "xonqa",
        "yangibozor", "shovot", "xiva", "boston", "mingbuloq",
    )
}
