"use client";

import { useState } from "react";
import {
  estimateSunlight,
  type SpaceOrientation,
} from "@/features/growing-space/domain/sunlight-estimate";
import { geolocationErrorMessage } from "@/features/growing-space/domain/location-message";
import { geocodeAddress } from "@/features/growing-space/infrastructure/location-api";
import type { SunlightExposure } from "@/shared/domain/growing-environment";

export interface SunlightLocationValue {
  address: string;
  estimatedSunlightHours: number | null;
  latitude: string;
  longitude: string;
  orientation: SpaceOrientation | null;
}

interface SunlightLocationAssistantProps {
  onApply: (value: SunlightLocationValue, sunlight: SunlightExposure) => void;
  value: SunlightLocationValue;
}

const ORIENTATION_OPTIONS: readonly { label: string; value: SpaceOrientation }[] = [
  { value: "open", label: "사방이 트인 야외" },
  { value: "south", label: "남향" },
  { value: "southeast", label: "남동향" },
  { value: "southwest", label: "남서향" },
  { value: "east", label: "동향" },
  { value: "west", label: "서향" },
  { value: "northeast", label: "북동향" },
  { value: "northwest", label: "북서향" },
  { value: "north", label: "북향" },
];

export function SunlightLocationAssistant({ onApply, value }: SunlightLocationAssistantProps) {
  const [addressInput, setAddressInput] = useState(value.address);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function searchAddress() {
    if (addressInput.trim().length < 2) {
      setMessage("도로명 주소를 입력해 주세요.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const location = await geocodeAddress(addressInput.trim());
      applyLocation(location.latitude, location.longitude, location.address, value.orientation);
      setAddressInput(location.address);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주소를 찾지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("이 브라우저는 현재 위치 기능을 지원하지 않습니다.");
      return;
    }

    setBusy(true);
    setMessage("위치 권한을 확인하고 있습니다.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        applyLocation(coords.latitude, coords.longitude, "현재 위치", value.orientation);
        setBusy(false);
      },
      (error) => {
        setMessage(geolocationErrorMessage(error));
        setBusy(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  }

  function selectOrientation(orientation: SpaceOrientation) {
    const latitude = Number(value.latitude);
    if (!Number.isFinite(latitude) || value.latitude === "") {
      onApply({ ...value, orientation }, "partial");
      setMessage("주소 검색이나 현재 위치 확인을 먼저 하면 예상 시간을 계산할 수 있습니다.");
      return;
    }

    applyLocation(latitude, Number(value.longitude), value.address, orientation);
  }

  function applyLocation(latitude: number, longitude: number, address: string, orientation: SpaceOrientation | null) {
    const estimate = orientation ? estimateSunlight(latitude, orientation) : null;
    onApply({
      address,
      latitude: latitude.toFixed(7),
      longitude: longitude.toFixed(7),
      orientation,
      estimatedSunlightHours: estimate?.hours ?? null,
    }, estimate?.exposure ?? "partial");
    setMessage(estimate ? `예상 직사광 시간은 하루 약 ${estimate.hours}시간입니다.` : "위치를 확인했습니다. 공간 방향을 선택해 주세요.");
  }

  const mapUrl = value.latitude && value.longitude
    ? `https://map.kakao.com/link/map/${encodeURIComponent(value.address || "재배 공간")},${value.latitude},${value.longitude}`
    : null;

  return (
    <section className="rounded-3xl border border-leaf/20 bg-leaf-soft/35 p-5" aria-labelledby="sunlight-helper-title">
      <h2 className="text-lg font-bold" id="sunlight-helper-title">햇빛 자동 추정</h2>
      <p className="mt-2 text-sm leading-6 text-muted">주소 또는 현재 위치 중 한 가지 방법으로 장소를 정한 뒤, 창·베란다가 바라보는 방향을 선택하면 예상 일조 시간을 계산합니다.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="font-bold sm:col-span-2" htmlFor="space-address-search">주소로 찾기</label>
        <input className="form-input" id="space-address-search" onChange={(event) => setAddressInput(event.target.value)} placeholder="예: 서울특별시 중구 세종대로 110" value={addressInput} />
        <button className="rounded-full border border-leaf px-5 py-3 font-bold text-leaf disabled:opacity-50" disabled={busy} onClick={() => void searchAddress()} type="button">입력한 주소 검색</button>
      </div>

      <div className="my-4 flex items-center gap-3 text-xs text-muted" aria-hidden="true"><span className="h-px flex-1 bg-ink/10" />또는<span className="h-px flex-1 bg-ink/10" /></div>
      <button className="w-full rounded-full bg-leaf px-5 py-3 font-bold text-white disabled:opacity-50" disabled={busy} onClick={useCurrentLocation} type="button">이 기기의 현재 위치 사용</button>

      {value.latitude && value.longitude && (
        <p className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-sm"><strong>선택된 위치:</strong> {value.address}</p>
      )}

      <label className="mt-4 block font-bold" htmlFor="space-orientation">공간 방향</label>
      <select className="form-input mt-2" id="space-orientation" onChange={(event) => selectOrientation(event.target.value as SpaceOrientation)} value={value.orientation ?? ""}>
        <option value="">방향 선택</option>
        {ORIENTATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      {message && <p className="mt-3 text-sm font-semibold text-leaf-dark" role="status">{message}</p>}
      {mapUrl && <a className="mt-3 inline-flex font-bold text-leaf underline" href={mapUrl} rel="noreferrer" target="_blank">카카오맵에서 위치와 건물 방향 확인하기 ↗</a>}

      <details className="mt-4 rounded-2xl border border-ink/10 bg-white/80 p-4 text-sm leading-6">
        <summary className="cursor-pointer font-bold">지도에서 공간 방향 확인하는 방법</summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted">
          <li>카카오맵 링크를 열고 지도를 회전하지 않은 기본 상태로 둡니다. 화면 위쪽이 북쪽입니다.</li>
          <li>집 안에서 창문이나 베란다 바깥을 정면으로 바라봅니다.</li>
          <li>바라보는 쪽이 지도 위면 북향, 오른쪽이면 동향, 아래면 남향, 왼쪽이면 서향입니다.</li>
          <li>두 방향 사이를 바라보면 북동·남동·남서·북서향을 선택합니다. 옥상이나 야외 텃밭은 ‘사방이 트인 야외’를 선택합니다.</li>
        </ol>
        <p className="mt-2 text-muted">건물·나무·차양의 그림자는 지도만으로 정확히 알 수 없으므로 계산 후 하루 일조 시간을 직접 보정할 수 있습니다.</p>
      </details>
    </section>
  );
}
