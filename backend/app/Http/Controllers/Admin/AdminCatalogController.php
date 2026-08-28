<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Crop;
use App\Models\CropSource;
use Illuminate\View\View;

class AdminCatalogController extends Controller
{
    public function __invoke(): View
    {
        return view('admin.catalog.index', [
            'crops' => Crop::query()->with('source')->orderBy('category')->orderBy('name')->get(),
            'sources' => CropSource::query()->withCount('crops')->orderBy('organization')->get(),
        ]);
    }
}
