<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Tasks;

use App\Http\Requests\Api\V1\StrictJsonRequest;

class DeleteSeasonTasksRequest extends StrictJsonRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'tasks' => ['required', 'array', 'min:1', 'max:100'],
            'tasks.*' => ['required', 'array:id,version'],
            'tasks.*.id' => ['required', 'uuid', 'distinct:strict'],
            'tasks.*.version' => ['required', 'integer', 'min:1'],
        ];
    }

    /** @return list<array{id: string, version: int}> */
    public function taskVersions(): array
    {
        /** @var list<array{id: string, version: int}> $tasks */
        $tasks = $this->validated('tasks');

        return $tasks;
    }

    /** @return list<string> */
    protected function allowedFields(): array
    {
        return ['tasks'];
    }
}
