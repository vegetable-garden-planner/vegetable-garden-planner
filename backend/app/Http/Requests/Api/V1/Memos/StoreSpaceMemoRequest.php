<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Memos;

class StoreSpaceMemoRequest extends SpaceMemoRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return $this->memoRules('required');
    }
}
