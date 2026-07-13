<?php

namespace App\Concerns;

use App\Currency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait PreferencesValidationRules
{
    /**
     * Get the validation rules used to validate user preferences.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function preferencesRules(): array
    {
        return [
            'currency' => ['required', Rule::enum(Currency::class)],
            'dashboard_notifications' => ['required', 'boolean'],
            'email_notifications' => ['required', 'boolean'],
            'sms_notifications' => ['required', 'boolean'],
            'phone_number' => ['nullable', 'string', 'max:20'],
        ];
    }
}
