<?php

use App\Models\User;

/**
 * @return array<string, mixed>
 */
function validPreferencesPayload(array $overrides = []): array
{
    return array_merge([
        'currency' => 'USD',
        'dashboard_notifications' => true,
        'email_notifications' => true,
        'sms_notifications' => false,
    ], $overrides);
}

test('preferences page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('preferences.edit'));

    $response->assertOk();
});

test('user preferences can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('preferences.update'), validPreferencesPayload([
            'currency' => 'LKR',
            'dashboard_notifications' => false,
            'email_notifications' => false,
            'sms_notifications' => true,
            'phone_number' => '+94771234567',
        ]));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('preferences.edit'));

    $user->refresh();

    expect($user->currency)->toBe('LKR');
    expect($user->dashboard_notifications)->toBeFalse();
    expect($user->email_notifications)->toBeFalse();
    expect($user->sms_notifications)->toBeTrue();
    expect($user->phone_number)->toBe('+94771234567');
});

test('invalid currency is rejected', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('preferences.edit'))
        ->patch(route('preferences.update'), validPreferencesPayload([
            'currency' => 'INVALID',
        ]));

    $response
        ->assertSessionHasErrors('currency')
        ->assertRedirect(route('preferences.edit'));
});
