import type { PostcodeResult } from "@/features/growing-space/domain/postcode-address";

interface DaumPostcodeOptions {
  oncomplete: (result: PostcodeResult) => void;
  onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
}

interface DaumPostcodeInstance {
  open(): void;
}

interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): DaumPostcodeInstance;
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor };
  }
}

export {};
