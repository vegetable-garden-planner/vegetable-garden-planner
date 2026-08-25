<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1\Watering;

use App\Actions\Watering\DeleteWateringSchedule;
use App\Http\Controllers\Controller;
use App\Models\WateringSchedule;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class DestroyWateringScheduleController extends Controller
{
    public function __invoke(
        Request $request,
        WateringSchedule $wateringSchedule,
        DeleteWateringSchedule $deleteSchedule,
    ): Response {
        Gate::authorize('update', $wateringSchedule);
        $deleteSchedule->execute($wateringSchedule, $request->header('If-Match'));

        return response()->noContent();
    }
}
