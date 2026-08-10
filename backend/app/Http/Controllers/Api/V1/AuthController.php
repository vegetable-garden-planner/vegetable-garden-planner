<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:255'],
            'nickname' => ['required', 'string', 'min:2', 'max:20'],
            'password' => ['required', 'string', 'min:8'],
            'passwordConfirmation' => ['required', 'string', 'same:password'],
        ]);

        if (User::query()->where('email', mb_strtolower($data['email']))->exists()) {
            return response()->json([
                'error' => [
                    'code' => 'EMAIL_ALREADY_EXISTS',
                    'message' => '이미 가입된 이메일입니다.',
                    'fields' => ['email' => ['이미 가입된 이메일입니다.']],
                ],
            ], 409);
        }

        $user = User::query()->create([
            'name' => $data['nickname'],
            'nickname' => $data['nickname'],
            'email' => mb_strtolower($data['email']),
            'password' => Hash::make($data['password']),
            'role' => 'member',
        ]);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json(['data' => ['user' => ApiData::user($user)]], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string'],
        ]);
        $credentials['email'] = mb_strtolower($credentials['email']);

        if (! Auth::guard('web')->attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => ['이메일 또는 비밀번호가 올바르지 않습니다.'],
            ]);
        }

        $request->session()->regenerate();
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => ['user' => ApiData::user($user)]]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(status: 204);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json(['data' => ApiData::user($user)]);
    }
}
