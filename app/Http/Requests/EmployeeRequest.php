<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeRequest extends FormRequest
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
            'employee_id' => ['required', 'string', 'max:20', 'unique:employees,employee_id,' . ($this->route('employee') ?? '0')],
            'first_name' => ['required', 'string', 'max:50'],
            'last_name' => ['required', 'string', 'max:50'],
            'middle_name' => ['nullable', 'string', 'max:50'],
            'date_of_birth' => ['required', 'date', 'before:today'],
            'gender' => ['required', 'in:male,female,other'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'emergency_contact' => ['nullable', 'string', 'max:100'],
            'emergency_phone' => ['nullable', 'string', 'max:20'],
            'position_title' => ['required', 'string', 'max:100'],
            'department' => ['required', 'string', 'max:100'],
            'hire_date' => ['required', 'date', 'on_or_before:today'],
            'termination_date' => ['nullable', 'date', 'on_or_after:hire_date'],
            'employment_status' => ['required', 'in:active,inactive,terminated,on_leave'],
            'supervisor_id' => ['nullable', 'exists:employees,id'],
            'certifications' => ['nullable', 'string'],
            'training_records' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email,' . (($this->route('employee') && $this->route('employee')->user) ? $this->route('employee')->user->id : 0)],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'employee_id.unique' => 'The employee ID has already been taken.',
            'email.unique' => 'The email has already been taken.',
        ];
    }
}