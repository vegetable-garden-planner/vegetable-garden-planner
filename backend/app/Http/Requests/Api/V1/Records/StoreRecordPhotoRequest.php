<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Records;

use App\Models\CultivationRecord;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class StoreRecordPhotoRequest extends FormRequest
{
    public const MAX_KILOBYTES = 5120;

    public function authorize(): bool
    {
        $record = $this->route('cultivationRecord');

        return $record instanceof CultivationRecord && $this->user()?->can('update', $record->growingSeason) === true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'photo' => ['required', 'file', 'image', 'mimes:jpeg,png,webp', 'max:'.self::MAX_KILOBYTES],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'photo.required' => '사진 파일을 선택해 주세요.',
            'photo.image' => 'JPG, PNG, WEBP 이미지 파일만 올릴 수 있습니다.',
            'photo.mimes' => 'JPG, PNG, WEBP 이미지 파일만 올릴 수 있습니다.',
            'photo.max' => '사진은 5MB 이하만 올릴 수 있습니다.',
        ];
    }

    public function photo(): UploadedFile
    {
        $photo = $this->file('photo');
        assert($photo instanceof UploadedFile);

        return $photo;
    }
}
