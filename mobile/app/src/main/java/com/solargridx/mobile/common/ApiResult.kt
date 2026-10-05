package com.solargridx.mobile.common

import com.google.gson.Gson
import com.google.gson.JsonSyntaxException
import kotlinx.coroutines.CancellationException
import retrofit2.Response
import java.io.IOException

/**
 * The API's error body: { code, message, details[] }. Every failure the UI shows
 * is turned into one of these, so screens render errors one way.
 */
data class ApiError(
    val code: String,
    val message: String,
    val details: List<String> = emptyList(),
    val httpStatus: Int? = null
) {
    val isNetwork: Boolean get() = code == NETWORK_ERROR

    companion object {
        const val NETWORK_ERROR = "NETWORK_ERROR"
        const val UNKNOWN_ERROR = "UNKNOWN_ERROR"

        fun network() = ApiError(
            NETWORK_ERROR,
            "Unable to reach the SolarGridX server. Check your connection and try again."
        )
    }
}

sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Failure(val error: ApiError) : ApiResult<Nothing>
}

private data class ErrorBody(val code: String?, val message: String?, val details: List<String>?)

private val gson = Gson()

/** Runs a Retrofit call and maps every outcome (success, API error, offline) to an ApiResult. */
suspend fun <T> safeApiCall(call: suspend () -> Response<T>): ApiResult<T> {
    return try {
        val response = call()
        val body = response.body()
        when {
            response.isSuccessful && body != null -> ApiResult.Success(body)
            response.isSuccessful -> ApiResult.Failure(
                ApiError(ApiError.UNKNOWN_ERROR, "The server sent an empty response.", httpStatus = response.code())
            )
            else -> ApiResult.Failure(parseError(response))
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: IOException) {
        ApiResult.Failure(ApiError.network())
    } catch (e: RuntimeException) {
        ApiResult.Failure(ApiError(ApiError.UNKNOWN_ERROR, "Something went wrong. Please try again."))
    }
}

/** Like safeApiCall, for endpoints that answer 204 No Content: success needs no body. */
suspend fun safeNoContentCall(call: suspend () -> Response<Unit>): ApiResult<Unit> {
    return try {
        val response = call()
        if (response.isSuccessful) ApiResult.Success(Unit) else ApiResult.Failure(parseError(response))
    } catch (e: CancellationException) {
        throw e
    } catch (e: IOException) {
        ApiResult.Failure(ApiError.network())
    } catch (e: RuntimeException) {
        ApiResult.Failure(ApiError(ApiError.UNKNOWN_ERROR, "Something went wrong. Please try again."))
    }
}

private fun parseError(response: Response<*>): ApiError {
    val status = response.code()
    val parsed = try {
        response.errorBody()?.string()?.let { gson.fromJson(it, ErrorBody::class.java) }
    } catch (e: JsonSyntaxException) {
        null
    } catch (e: IOException) {
        null
    }

    if (parsed?.code != null && parsed.message != null) {
        return ApiError(parsed.code, parsed.message, parsed.details.orEmpty(), status)
    }
    val fallback = when {
        status == 403 -> "You do not have permission to do that."
        status >= 500 -> "The server ran into a problem. Please try again shortly."
        else -> "Something went wrong. Please try again."
    }
    return ApiError(ApiError.UNKNOWN_ERROR, fallback, httpStatus = status)
}
