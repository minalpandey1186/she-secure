package org.shesecure.app.ui

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import org.shesecure.app.data.model.PoliceStation
import org.shesecure.app.databinding.ItemPoliceStationBinding
import java.util.Locale

class SafeRouteAdapter(
    private val onSelectStation: (PoliceStation) -> Unit,
    private val onCallStation: (PoliceStation) -> Unit
) : ListAdapter<PoliceStation, SafeRouteAdapter.StationViewHolder>(StationDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): StationViewHolder {
        val binding = ItemPoliceStationBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return StationViewHolder(binding)
    }

    override fun onBindViewHolder(holder: StationViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class StationViewHolder(private val binding: ItemPoliceStationBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(station: PoliceStation) {
            binding.tvStationName.text = station.name
            binding.tvStationAddress.text = station.address

            val formattedDistance = if (station.distanceMeters >= 1000) {
                String.format(Locale.US, "%.1f km", station.distanceMeters / 1000.0)
            } else {
                "${station.distanceMeters.toInt()} m"
            }
            binding.tvStationDistance.text = formattedDistance
            binding.tvWalkingTime.text = "~${station.estimatedWalkingMinutes} min walk"

            binding.btnNavigateStation.setOnClickListener {
                onSelectStation(station)
            }

            binding.btnCallStation.setOnClickListener {
                onCallStation(station)
            }
        }
    }

    class StationDiffCallback : DiffUtil.ItemCallback<PoliceStation>() {
        override fun areItemsTheSame(oldItem: PoliceStation, newItem: PoliceStation): Boolean =
            oldItem.id == newItem.id

        override fun areContentsTheSame(oldItem: PoliceStation, newItem: PoliceStation): Boolean =
            oldItem == newItem
    }
}
