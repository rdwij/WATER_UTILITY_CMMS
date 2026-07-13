<?php

namespace App\Http\Requests\Settings;

use App\Concerns\PreferencesValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class PreferencesUpdateRequest extends FormRequest
{
    use PreferencesValidationRules;

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'dashboard_notifications' => $this->boolean('dashboard_notifications'),
            'email_notifications' => $this->boolean('email_notifications'),
            'sms_notifications' => $this->boolean('sms_notifications'),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->preferencesRules();
    }
}
