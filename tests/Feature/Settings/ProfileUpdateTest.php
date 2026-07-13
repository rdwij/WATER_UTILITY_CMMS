<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * @return array<string, mixed>
 */
function validProfilePayload(User $user, array $overrides = []): array
{
    return array_merge([
        'name' => $user->name,
        'email' => $user->email,
    ], $overrides);
}

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'name' => 'Test User',
        ]));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();
    expect($user->fresh())->toBeNull();
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('profile photo can be uploaded', function () {
    Storage::fake('profiles');

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    $avatarPath = $user->getRawOriginal('avatar');

    expect($avatarPath)->toStartWith($user->id.'/');
    Storage::disk('profiles')->assertExists($avatarPath);
    expect($user->avatar)->toBe(Storage::disk('profiles')->url($avatarPath));
});

test('invalid profile photo is rejected', function () {
    Storage::fake('profiles');

    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ]));

    $response
        ->assertSessionHasErrors('avatar')
        ->assertRedirect(route('profile.edit'));
});

test('replacing a profile photo deletes the previous file', function () {
    Storage::fake('profiles');

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]));

    $user->refresh();
    $originalAvatarPath = $user->getRawOriginal('avatar');

    $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->image('new-avatar.jpg'),
        ]));

    $user->refresh();

    Storage::disk('profiles')->assertMissing($originalAvatarPath);
    Storage::disk('profiles')->assertExists($user->getRawOriginal('avatar'));
});

test('profile photo can be removed', function () {
    Storage::fake('profiles');

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]));

    $user->refresh();
    $avatarPath = $user->getRawOriginal('avatar');

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'remove_avatar' => true,
        ]));

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->getRawOriginal('avatar'))->toBeNull();
    Storage::disk('profiles')->assertMissing($avatarPath);
});

test('profile photo is deleted when account is deleted', function () {
    Storage::fake('profiles');

    $user = User::factory()->create();

    $this
        ->actingAs($user)
        ->patch(route('profile.update'), validProfilePayload($user, [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]));

    $user->refresh();
    $avatarPath = $user->getRawOriginal('avatar');

    $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    Storage::disk('profiles')->assertMissing($avatarPath);
});
