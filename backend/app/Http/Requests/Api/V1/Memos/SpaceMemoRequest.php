<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Memos;

use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\GrowingSpace;
use App\Models\SpaceMemo;

abstract class SpaceMemoRequest extends StrictJsonRequest
{
    private const FIELD_TO_COLUMN = [
        'body' => 'body',
        'cropId' => 'crop_id',
    ];

    public function authorize(): bool
    {
        $space = $this->memoSpace();

        return $space === null || $this->user()?->can('update', $space) === true;
    }

    /** @return array<string, mixed> */
    protected function memoRules(string $presence): array
    {
        return [
            'body' => [$presence, 'string', 'min:1', 'max:1000'],
            'cropId' => [$presence === 'required' ? 'nullable' : $presence, 'nullable', 'string', 'max:100', 'exists:crops,id'],
        ];
    }

    /** @return array<string, mixed> */
    public function persistenceAttributes(): array
    {
        $validated = $this->validated();
        $attributes = [];

        foreach (self::FIELD_TO_COLUMN as $field => $column) {
            if (array_key_exists($field, $validated)) {
                $attributes[$column] = $validated[$field];
            }
        }

        return $attributes;
    }

    protected function prepareForValidation(): void
    {
        if ($this->exists('body') && is_string($this->input('body'))) {
            $this->merge(['body' => trim((string) $this->input('body'))]);
        }
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return array_keys(self::FIELD_TO_COLUMN);
    }

    private function memoSpace(): ?GrowingSpace
    {
        $space = $this->route('growingSpace');
        if ($space instanceof GrowingSpace) {
            return $space;
        }

        $memo = $this->route('spaceMemo');

        return $memo instanceof SpaceMemo ? $memo->growingSpace : null;
    }
}
