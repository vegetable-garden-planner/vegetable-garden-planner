<?php

declare(strict_types=1);

namespace App\Http\Controllers\Documentation;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\View\View;

final class ShowApiDocumentationController extends Controller
{
    public function __invoke(): View
    {
        return view('api-docs');
    }
}
