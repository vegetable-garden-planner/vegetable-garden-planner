export interface PostcodeResult {
  address: string;
  buildingName: string;
  jibunAddress: string;
  roadAddress: string;
  zonecode: string;
}

export function selectedPostcodeAddress(result: PostcodeResult): string {
  return result.roadAddress.trim() || result.jibunAddress.trim() || result.address.trim();
}
