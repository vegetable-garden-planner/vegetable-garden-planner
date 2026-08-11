<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Tasks;

use App\Enums\CultivationTaskStatus;
use App\Http\Requests\Api\V1\StrictJsonRequest;
use App\Models\CultivationTask;
use Carbon\CarbonImmutable;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateTaskRequest extends StrictJsonRequest
{
    private const FIELD_TO_COLUMN = [
        'title' => 'title',
        'dueDate' => 'due_date',
        'notes' => 'notes',
        'status' => 'status',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:1', 'max:100'],
            'dueDate' => ['sometimes', 'string', 'date_format:Y-m-d'],
            'notes' => ['sometimes', 'string', 'max:1000'],
            'status' => ['sometimes', 'string', Rule::enum(CultivationTaskStatus::class)],
        ];
    }

    /** @return list<callable(Validator): void> */
    public function after(): array
    {
        return [
            ...parent::after(),
            function (Validator $validator): void {
                if ($validator->errors()->has('dueDate') || ! $this->has('dueDate')) {
                    return;
                }

                $task = $this->route('cultivationTask');
                if (! $task instanceof CultivationTask) {
                    return;
                }

                $dueDate = CarbonImmutable::createFromFormat('!Y-m-d', $this->string('dueDate')->toString());
                $season = $task->growingSeason;
                if ($dueDate->isBefore($season->start_date) || $dueDate->isAfter($season->end_date)) {
                    $validator->errors()->add('dueDate', '예정일은 시즌 기간 안이어야 합니다.');
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
            if (array_key_exists($field, $validated)) {
                $attributes[$column] = $validated[$field];
            }
        }

        return $attributes;
    }

    protected function prepareForValidation(): void
    {
        $normalized = [];
        foreach (['title', 'notes'] as $field) {
            if ($this->exists($field)) {
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
}
