import { Head } from '@inertiajs/react';
import {
  Button,
  Checkbox,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Separator,
} from '@/components/ui';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function UsersCreate() {
  const { data, post, processing, errors, reset } = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    avatar: null,
    currency: 'USD',
    dashboard_notifications: false,
    email_notifications: false,
    sms_notifications: false,
    phone_number: '',
    roles: [],
  });

  const { data: roles } = usePage().props;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('users.store'), {
      onError: () => {
        // Form errors will be handled by Inertia
      },
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <>
      <Head title="Create User" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create User</h1>
          <p className="text-muted-foreground">
            Add a new user to the system
          </p>
        </div>

        <Form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <input
                      {...field}
                      placeholder="John Doe"
                      className="input input-bordered w-full"
                      aria-invalid={!!errors.name}
                    />
                  </FormControl>
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <input
                      type="email"
                      {...field}
                      placeholder="john@example.com"
                      className="input input-bordered w-full"
                      aria-invalid={!!errors.email}
                    />
                  </FormControl>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* Authentication */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Authentication</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <input
                      type="password"
                      {...field}
                      placeholder="••••••••"
                      className="input input-bordered w-full"
                      aria-invalid={!!errors.password}
                    />
                  </FormControl>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <input
                      type="password"
                      {...field}
                      placeholder="••••••••"
                      className="input input-bordered w-full"
                      aria-invalid={!!errors.password_confirmation}
                    />
                  </FormControl>
                  {errors.password_confirmation && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* Profile Information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="avatar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar</FormLabel>
                  <FormControl>
                    <input
                      type="file"
                      accept="image/*"
                      {...field}
                      className="file-input file-input-bordered w-full"
                      aria-invalid={!!errors.avatar}
                    />
                  </FormControl>
                  {errors.avatar && (
                    <p className="text-sm text-destructive">{errors.message}</p>
                  )}
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="select select-bordered w-full"
                        aria-invalid={!!errors.currency}
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="AUD">AUD - Australian Dollar</option>
                      </select>
                    </FormControl>
                    {errors.currency && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="phone_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <input
                        type="tel"
                        {...field}
                        placeholder="+1 (555) 123-4567"
                        className="input input-bordered w-full"
                        aria-invalid={!!errors.phone_number}
                      />
                    </FormControl>
                    {errors.phone_number && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Notification Preferences */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="dashboard_notifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dashboard Notifications</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      className="checkbox checkbox-primary"
                    />
                    <span className="ml-2">Enable dashboard notifications</span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="email_notifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Notifications</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      className="checkbox checkbox-primary"
                    />
                    <span className="ml-2">Enable email notifications</span>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="sms_notifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SMS Notifications</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      className="checkbox checkbox-primary"
                    />
                    <span className="ml-2">Enable SMS notifications</span>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Role Assignment */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Role Assignment</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="roles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roles</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {roles.map((role: any) => (
                        <div key={role.id} className="flex items-center">
                          <Checkbox
                            checked={field.value.includes(role.id)}
                            onChange={(checked) => {
                              const current = field.value || [];
                              const index = current.indexOf(role.id);
                              if (checked && index === -1) {
                                field.onChange([...current, role.id]);
                              } else if (!checked && index !== -1) {
                                field.onChange(
                                  current.filter((id: number) => id !== role.id)
                                );
                              }
                            }}
                            className="checkbox checkbox-primary"
                          />
                          <span className="ml-2">{role.display_name}</span>
                        </div>
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <Button type="button" onClick={() => reset()} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Create User
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}