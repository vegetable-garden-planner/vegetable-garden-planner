<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Records;

use App\Enums\CultivationRecordType;
use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\CultivationRecord;
use App\Models\GrowingSeason;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

abstract class CultivationRecordRequest extends StrictJsonRequest
{
    private const FIELD_TO_COLUMN = [
        'type' => 'type',
        'occurredAt' => 'occurred_at',
        'notes' => 'notes',
        'quantity' => 'quantity',
        'unit' => 'unit',
    ];

    public function authorize(): bool
    {
        $season = $this->recordSeason();

        return $season === null || $this->user()?->can('update', $season) === true;
    }

    /** @return array<string, mixed> */
    protected function recordRules(string $presence): array
    {
        return [
            'type' => [$presence, 'string', Rule::enum(CultivationRecordType::class)],
            'occurredAt' => [$presence, 'string', 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/'],
            'notes' => [$presence, 'nullable', 'string', 'max:2000'],
            'quantity' => ['nullable', 'numeric', 'gt:0', 'required_with:unit'],
            'unit' => ['nullable', 'string', 'max:20', 'required_with:quantity'],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->has('occurredAt') || ! $this->has('occurredAt')) {
                    return;
                }

                $occurredAt = CarbonImmutable::parse($this->string('occurredAt')->toString());
                $season = $this->recordSeason();
                if ($season === null) {
                    return;
                }

                $occurredOn = $occurredAt->toDateString();
                if ($occurredOn < $season->start_date->toDateString()
                    || $occurredOn > $season->end_date->toDateString()) {
                    $validator->errors()->add('occurredAt', '기록 시각은 시즌 기간 안이어야 합니다.');
                }
            },
        ];
    }

    /** @return array<string, mixed> */
    public function persistenceAttributes(): array
    {
        $validated = $this->validated();
        $attributes = [];

        foreach (self::FIELD_TO_COLUMN as $field => $column) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }

            $attributes[$column] = match ($field) {
                'occurredAt' => CarbonImmutable::parse((string) $validated[$field])->utc(),
                'notes' => $validated[$field] ?? '',
                default => $validated[$field],
            };
        }

        return $attributes;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];
        if ($this->exists('notes') && $this->input('notes') === null) {
            $normalized['notes'] = '';
        }
        foreach (['notes', 'unit'] as $field) {
            if ($this->exists($field) && is_string($this->input($field))) {
                $normalized[$field] = trim((string) $this->input($field));
            }
        }
        $this->merge($normalized);
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return array_keys(self::FIELD_TO_COLUMN);
    }

    private function recordSeason(): ?GrowingSeason
    {
        $season = $this->route('growingSeason');
        if ($season instanceof GrowingSeason) {
            return $season;
        }

        $record = $this->route('cultivationRecord');

        return $record instanceof CultivationRecord ? $record->growingSeason : null;
    }
}
