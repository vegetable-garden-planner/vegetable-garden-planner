"use client";

import { useState } from "react";
import Script from "next/script";
import {
  estimateSunlight,
  type SpaceOrientation,
} from "@/features/growing-space/domain/sunlight-estimate";
import { geolocationErrorMessage } from "@/features/growing-space/domain/location-message";
import {
  selectedPostcodeAddress,
  type PostcodeResult,
} from "@/features/growing-space/domain/postcode-address";
import { geocodeAddress } from "@/features/growing-space/infrastructure/location-api";
import type { SunlightExposure } from "@/shared/domain/growing-environment";
import styles from "@/features/growing-space/components/growing-space.module.css";

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
  const [postcodeReady, setPostcodeReady] = useState(false);

  async function searchAddress(address: string) {
    if (address.trim().length < 2) {
      setMessage("주소 검색 창에서 주소를 선택해 주세요.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const location = await geocodeAddress(address.trim());
      applyLocation(location.latitude, location.longitude, location.address, value.orientation);
      setAddressInput(location.address);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "주소를 찾지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function openPostcodeSearch() {
    if (!postcodeReady || !window.daum) {
      setMessage("주소 검색창을 준비하고 있습니다. 잠시 후 다시 눌러 주세요.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (result: PostcodeResult) => {
        const address = selectedPostcodeAddress(result);
        setAddressInput(address);
        void searchAddress(address);
      },
    }).open();
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
    <section className={styles.locationAssistant} aria-labelledby="sunlight-helper-title">
      <Script
        onError={() => setMessage("주소 검색창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")}
        onReady={() => setPostcodeReady(true)}
        src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
        strategy="lazyOnload"
      />
      <div className={styles.locationHeading}><span aria-hidden="true">+</span><div><h2 id="sunlight-helper-title">햇빛 자동 추정</h2><p>주소 또는 현재 위치를 정하고 공간 방향을 선택하면 예상 일조 시간을 계산합니다.</p></div></div>

      <div className={styles.locationSearch}>
        <label htmlFor="space-address-search">주소로 찾기</label>
        <input className={styles.input} id="space-address-search" placeholder="주소 검색 버튼을 눌러 선택해 주세요" readOnly value={addressInput} />
        <button disabled={busy} onClick={openPostcodeSearch} type="button">주소 검색</button>
      </div>

      <div className={styles.locationDivider} aria-hidden="true"><span />또는<span /></div>
      <button className={styles.locationButton} disabled={busy} onClick={useCurrentLocation} type="button">이 기기의 현재 위치 사용</button>

      {value.latitude && value.longitude && (
        <p className={styles.locationValue}><strong>선택된 위치</strong><span>{value.address}</span></p>
      )}

      <label className={styles.locationLabel} htmlFor="space-orientation">공간 방향</label>
      <select className={styles.input} id="space-orientation" onChange={(event) => selectOrientation(event.target.value as SpaceOrientation)} value={value.orientation ?? ""}>
        <option value="">방향 선택</option>
        {ORIENTATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      {message && <p className={styles.locationMessage} role="status">{message}</p>}
      {mapUrl && <a className={styles.mapLink} href={mapUrl} rel="noreferrer" target="_blank">카카오맵에서 위치와 건물 방향 확인하기 ↗</a>}

      <details className={styles.locationGuide}>
        <summary>지도에서 공간 방향 확인하는 방법</summary>
        <ol>
          <li>카카오맵 링크를 열고 지도를 회전하지 않은 기본 상태로 둡니다. 화면 위쪽이 북쪽입니다.</li>
          <li>집 안에서 창문이나 베란다 바깥을 정면으로 바라봅니다.</li>
          <li>바라보는 쪽이 지도 위면 북향, 오른쪽이면 동향, 아래면 남향, 왼쪽이면 서향입니다.</li>
          <li>두 방향 사이를 바라보면 북동·남동·남서·북서향을 선택합니다. 옥상이나 야외 텃밭은 ‘사방이 트인 야외’를 선택합니다.</li>
        </ol>
        <p>건물·나무·차양의 그림자는 지도만으로 정확히 알 수 없으므로 계산 후 하루 일조 시간을 직접 보정할 수 있습니다.</p>
      </details>
    </section>
  );
}
