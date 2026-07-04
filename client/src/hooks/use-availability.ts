// client/src/hooks/use-availability.ts
// Fetches a listing's busy (unavailable) date ranges so the booking calendar can
// disable already-booked days. queryKey arrays join to the URL via the default
// getQueryFn: ["/api/properties", id, "availability"] → /api/properties/:id/availability.

import { useQuery } from "@tanstack/react-query";
import type { AvailabilityResponse } from "@shared/api-types";

/** STR whole-property availability. Disabled days are half-open [start, end). */
export function usePropertyAvailability(propertyId?: string) {
  return useQuery<AvailabilityResponse>({
    queryKey: ["/api/properties", propertyId ?? "", "availability"],
    enabled: !!propertyId,
  });
}

/** Co-living room availability. Disabled days are inclusive [start, end]. */
export function useRoomAvailability(roomId?: string) {
  return useQuery<AvailabilityResponse>({
    queryKey: ["/api/rooms", roomId ?? "", "availability"],
    enabled: !!roomId,
  });
}
