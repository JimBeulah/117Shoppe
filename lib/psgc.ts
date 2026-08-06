const PSGC_BASE = "https://psgc.gitlab.io/api"

// NCR has no province layer — its cities/municipalities sit directly under the region.
// This sentinel stands in for "province" in the UI so NCR can still be picked from one list.
export const NCR_REGION_CODE = "130000000"
export const NCR_PROVINCE_CODE = "NCR"

export interface PsgcProvince {
  code: string
  name: string
  regionCode: string
}

export interface PsgcCity {
  code: string
  name: string
  isCity: boolean
  isMunicipality: boolean
}

export interface PsgcBarangay {
  code: string
  name: string
}

export async function fetchProvinces(): Promise<PsgcProvince[]> {
  const res = await fetch(`${PSGC_BASE}/provinces/`)
  if (!res.ok) throw new Error("Failed to load provinces")
  const data: PsgcProvince[] = await res.json()
  data.push({ code: NCR_PROVINCE_CODE, name: "Metro Manila (NCR)", regionCode: NCR_REGION_CODE })
  return data.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchCities(provinceCode: string): Promise<PsgcCity[]> {
  const url =
    provinceCode === NCR_PROVINCE_CODE
      ? `${PSGC_BASE}/regions/${NCR_REGION_CODE}/cities-municipalities/`
      : `${PSGC_BASE}/provinces/${provinceCode}/cities-municipalities/`
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load cities/municipalities")
  const data: PsgcCity[] = await res.json()
  return data.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchBarangays(cityCode: string): Promise<PsgcBarangay[]> {
  const res = await fetch(`${PSGC_BASE}/cities-municipalities/${cityCode}/barangays/`)
  if (!res.ok) throw new Error("Failed to load barangays")
  const data: PsgcBarangay[] = await res.json()
  return data.sort((a, b) => a.name.localeCompare(b.name))
}
