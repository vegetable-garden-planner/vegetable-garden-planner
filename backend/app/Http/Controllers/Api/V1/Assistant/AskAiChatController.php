<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Assistant;

use App\Actions\Assistant\AskAiChat;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Assistant\AskAiChatRequest;
use App\Support\Auth\AuthenticatedUser;
use Illuminate\Http\JsonResponse;

class AskAiChatController extends Controller
{
    public function __invoke(AskAiChatRequest $request, AskAiChat $askAiChat): JsonResponse
    {
        $answer = $askAiChat->execute(AuthenticatedUser::from($request), $request->message());

        return response()->json(['data' => ['answer' => $answer]]);
    }
}
