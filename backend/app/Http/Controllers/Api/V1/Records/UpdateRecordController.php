<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Actions\Records\UpdateCultivationRecord;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\Records\UpdateRecordRequest;
use App\Http\Resources\Api\V1\CultivationRecordResource;
use App\Http\Responses\VersionedResourceResponse;
use App\Models\CultivationRecord;
use Illuminate\Http\JsonResponse;

class UpdateRecordController extends Controller
{
    public function __invoke(
        UpdateRecordRequest $request,
        CultivationRecord $cultivationRecord,
        UpdateCultivationRecord $updateRecord,
    ): JsonResponse {
        $record = $updateRecord->execute(
            $cultivationRecord,
            $request->persistenceAttributes(),
            $request->header('If-Match'),
        );

        return VersionedResourceResponse::make(
            CultivationRecordResource::make($record),
            $record->version,
        );
    }
}
