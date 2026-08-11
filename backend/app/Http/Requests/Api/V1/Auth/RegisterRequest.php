<?php

declare(strict_types=1);

namespace App\Http\Requests\Api\V1\Auth;

use App\Http\Requests\Api\V1\StrictJsonRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends StrictJsonRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            'nickname' => ['required', 'string', 'min:2', 'max:20'],
            'password' => ['required', 'string', Password::min(8)->letters()->numbers()],
            'passwordConfirmation' => ['required', 'string', 'same:password'],
        ];
    }

    public function email(): string
    {
        return $this->string('email')->toString();
    }

    public function nickname(): string
    {
        return $this->string('nickname')->toString();
    }

    public function password(): string
    {
        return $this->string('password')->toString();
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => mb_strtolower(trim((string) $this->input('email'))),
            'nickname' => trim((string) $this->input('nickname')),
        ]);
    }

    protected function allowedFields(): array
    {
        return ['email', 'nickname', 'password', 'passwordConfirmation'];
    }
}
