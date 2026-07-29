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
     * `user_id` and `email` are mutually exclusive ways to link an
     * employee to a user account:
     *   - select an existing user  → `user_id` is required, `email` ignored
     *   - create a new user        → `email` is required, `user_id` ignored
     *
     * The frontend form sends both fields, so we don't need a
     * conditional `required_without`; instead we accept either path
     * and let the controller branch on which one is present.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $employee = $this->route('employee');
        $existingUserId = is_object($employee) && $employee->user
            ? $employee->user->id
            : 0;

        return [
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'employee_id' => ['required', 'string', 'max:20', 'unique:employees,employee_id,' . ($employee?->id ?? 0)],
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
            'hire_date' => ['required', 'date', 'before_or_equal:today'],
            'termination_date' => ['nullable', 'date', 'after_or_equal:hire_date'],
            'employment_status' => ['required', 'in:active,inactive,terminated,on_leave'],
            'supervisor_id' => ['nullable', 'exists:employees,id'],
            'certifications' => ['nullable', 'string'],
            'training_records' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'email' => [
                'nullable',
                'string',
                'email',
                'max:255',
                // Ignore the email currently on file when editing, so
                // resubmitting the form without changing the field
                // doesn't trip the uniqueness check.
                'unique:users,email,' . $existingUserId,
            ],
        ];
    }

    /**
     * Apply an after-validation hook that enforces the "either
     * `user_id` or `email`" invariant — neither rule above can do
     * that alone because Laravel's `required_without` only fires when
     * a sibling field is present-and-empty, not when both are empty.
     */
    public function withValidator(\Illuminate\Contracts\Validation\Validator $validator): void
    {
        $validator->after(function ($validator) {
            $userId = $this->input('user_id');
            $email = $this->input('email');

            if (! $userId && ! $email) {
                $validator->errors()->add(
                    'email',
                    'Provide either an existing user (User ID) or a new email to create one.',
                );
            }
        });
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