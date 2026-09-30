package org.shesecure.app.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import org.shesecure.app.data.model.NominatimPlace
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface NominatimApiService {

    @GET("search")
    suspend fun searchPoliceStations(
        @Query("q") query: String = "police station",
        @Query("format") format: String = "json",
        @Query("addressdetails") addressDetails: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("viewbox") viewBox: String? = null,
        @Query("bounded") bounded: Int = 1,
        @Header("User-Agent") userAgent: String = "SheSecure-SmartWomenSafetyApp/1.0"
    ): List<NominatimPlace>

    companion object {
        private const val BASE_URL = "https://nominatim.openstreetmap.org/"

        fun create(): NominatimApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build()

            return Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(NominatimApiService::class.java)
        }
    }
}
