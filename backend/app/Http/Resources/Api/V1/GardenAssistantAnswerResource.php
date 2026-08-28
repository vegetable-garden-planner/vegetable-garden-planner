<?php

declare(strict_types=1);

namespace App\Http\Resources\Api\V1;

use App\Domain\Assistant\GardenAssistantAnswer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GardenAssistantAnswerResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var GardenAssistantAnswer $answer */
        $answer = $this->resource;

        return [
            'intent' => $answer->intent->value,
            'message' => $answer->message,
            'actionPerformed' => $answer->actionPerformed,
            'cropId' => $answer->cropId,
        ];
    }
}
