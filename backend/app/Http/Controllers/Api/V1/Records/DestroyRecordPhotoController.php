<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Actions\Records\ReplaceCultivationRecordPhoto;
use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\CultivationRecordResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\CultivationRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DestroyRecordPhotoController extends Controller
{
    public function __invoke(
        Request $request,
        CultivationRecord $cultivationRecord,
        ReplaceCultivationRecordPhoto $replacePhoto,
    ): JsonResponse {
        Gate::authorize('update', $cultivationRecord);
        $record = $replacePhoto->execute(
            $cultivationRecord,
            null,
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            CultivationRecordResource::make($record),
            $record->version,
        );
    }
}
