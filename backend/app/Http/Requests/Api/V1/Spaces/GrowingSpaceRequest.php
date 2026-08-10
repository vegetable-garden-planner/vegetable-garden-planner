<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Spaces;

use App\Enums\GrowingSpaceType;
use App\Enums\SunlightExposure;
use App\Http\Requests\Api\V1\StrictJsonRequest;
use Illuminate\Validation\Rule;

abstract class GrowingSpaceRequest extends StrictJsonRequest
{
    private const FIELD_TO_COLUMN = [
        'name' => 'name',
        'type' => 'type',
        'sunlight' => 'sunlight',
        'widthCm' => 'width_cm',
        'lengthCm' => 'length_cm',
        'region' => 'region',
        'notes' => 'notes',
    ];

    /**
     * @return array<string, mixed>
     */
    final public function persistenceAttributes(): array
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

    /**
     * @return array<string, mixed>
     */
    final protected function fieldRules(string $presence): array
    {
        return [
            'name' => [$presence, 'string', 'min:1', 'max:30'],
            'type' => [$presence, 'string', Rule::enum(GrowingSpaceType::class)],
            'sunlight' => [$presence, 'string', Rule::enum(SunlightExposure::class)],
            'widthCm' => [$presence, 'integer', 'min:10', 'max:100000'],
            'lengthCm' => [$presence, 'integer', 'min:10', 'max:100000'],
            'region' => [$presence, 'string', 'min:1', 'max:100'],
            'notes' => [$presence === 'required' ? 'present' : $presence, 'string', 'max:1000'],
        ];
    }

    final protected function prepareForValidation(): void
    {
        $normalized = [];

        foreach (['name', 'region', 'notes'] as $field) {
            if ($this->exists($field)) {
                $normalized[$field] = trim((string) $this->input($field));
            }
        }

        $this->merge($normalized);
    }

    final protected function allowedFields(): array
    {
        return array_keys(self::FIELD_TO_COLUMN);
    }
}
