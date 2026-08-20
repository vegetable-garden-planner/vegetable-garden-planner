<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Actions\Records\ReplaceCultivationRecordPhoto;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Records\StoreRecordPhotoRequest;
use App\Http\Resources\Api\V1\CultivationRecordResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\CultivationRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class StoreRecordPhotoController extends Controller
{
    public function __invoke(
        StoreRecordPhotoRequest $request,
        CultivationRecord $cultivationRecord,
        ReplaceCultivationRecordPhoto $replacePhoto,
    ): JsonResponse {
        Gate::authorize('update', $cultivationRecord->growingSeason);
        $record = $replacePhoto->execute(
            $cultivationRecord,
            $request->photo(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            CultivationRecordResource::make($record),
            $record->version,
        );
    }
}
