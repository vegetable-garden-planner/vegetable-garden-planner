<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assistant;

use App\Actions\Assistant\AskGardenAssistant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Assistant\AskGardenAssistantRequest;
use App\Http\Resources\Api\V1\GardenAssistantAnswerResource;
use App\Models\GrowingSeason;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class AskGardenAssistantController extends Controller
{
    public function __invoke(
        AskGardenAssistantRequest $request,
        GrowingSeason $growingSeason,
        AskGardenAssistant $askGardenAssistant,
    ): JsonResponse {
        $answer = $askGardenAssistant->execute(
            $growingSeason,
            AuthenticatedUser::from($request),
            $request->intent(),
            $request->cropId(),
        );

        return response()->json(['data' => GardenAssistantAnswerResource::make($answer)->resolve()]);
    }
}
