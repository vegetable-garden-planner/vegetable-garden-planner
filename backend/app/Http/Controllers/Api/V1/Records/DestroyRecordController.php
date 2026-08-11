<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Records;

use App\Actions\Records\DeleteCultivationRecord;
use App\Http\Controllers\Controller;
use App\Models\CultivationRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroyRecordController extends Controller
{
    public function __invoke(
        Request $request,
        CultivationRecord $cultivationRecord,
        DeleteCultivationRecord $deleteRecord,
    ): Response {
        Gate::authorize('update', $cultivationRecord->growingSeason);
        $deleteRecord->execute($cultivationRecord, $request->header('If-Match'));

        return response()->noContent();
    }
}
