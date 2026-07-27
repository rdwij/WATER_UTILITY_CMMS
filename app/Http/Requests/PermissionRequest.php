<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PermissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Adjust based on your authorization logic
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100', 'unique:permissions,name,' . ($this->route('permission') ?? '0')],
            'display_name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'group' => ['required', 'string', 'max:50'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}