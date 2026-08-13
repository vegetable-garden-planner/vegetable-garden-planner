export function geolocationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "위치 권한이 차단되었습니다. 주소창 왼쪽의 위치 아이콘에서 권한을 허용한 뒤 다시 눌러 주세요.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "현재 위치를 확인할 수 없습니다. 기기의 위치 서비스를 켜거나 주소로 찾아 주세요.";
  }
  if (error.code === error.TIMEOUT) {
    return "현재 위치 확인 시간이 초과되었습니다. 잠시 후 다시 시도하거나 주소로 찾아 주세요.";
  }
  return "현재 위치를 확인하지 못했습니다. 주소로 찾기를 이용해 주세요.";
}
