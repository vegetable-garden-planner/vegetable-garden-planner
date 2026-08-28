<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Actions\Records\CreateCultivationRecord;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Records\StoreRecordRequest;
use App\Http\Resources\Api\V1\CultivationRecordResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\GrowingSeason;
use Illuminate\Http\JsonResponse;

class StoreSeasonRecordController extends Controller
{
    public function __invoke(
        StoreRecordRequest $request,
        GrowingSeason $growingSeason,
        CreateCultivationRecord $createRecord,
    ): JsonResponse {
        $record = $createRecord->execute($growingSeason, $request->persistenceAttributes());

        return VersionedResourceResponse::make(
            CultivationRecordResource::make($record),
            $record->version,
            201,
        );
    }
}
