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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Textarea,
} from '@/components/ui';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function RolesCreate() {
  const { data, post, processing, errors, reset } = useForm({
    name: '',
    display_name: '',
    description: '',
  });

  const { data: permissions } = usePage().props;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('roles.store'), {
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
      <Head title="Create Role" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Role</h1>
          <p className="text-muted-foreground">
            Create a new role with specific permissions
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
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., water_technician"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="display_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Water Technician"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Describe the role responsibilities"
                      className="w-full h-24"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          {/* Permissions */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Permissions</h2>
            <Separator className="mb-4" />

            {permissions?.grouped && Object.keys(permissions.grouped).map((group) => (
              <div key={group} className="mb-6">
                <h3 className="text-lg font-medium mb-4">{group}</h3>
                <div className="space-y-2">
                  {permissions.grouped[group].map((permission: any) => (
                    <FormField
                      key={permission.id}
                      control={form}
                      name="permissions"
                      value={permission.id}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Checkbox
                              checked={field.value.includes(permission.id)}
                              onValueChange={(value) => {
                                const current = field.value || [];
                                const index = current.indexOf(permission.id);
                                if (value && index === -1) {
                                  field.onValueChange([...current, permission.id]);
                                } else if (!value && index !== -1) {
                                  field.onValueChange(
                                    current.filter((id: number) => id !== permission.id)
                                  );
                                }
                              }}
                              className="checkbox checkbox-primary"
                            />
                            <span className="ml-2">{permission.display_name}</span>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Fallback if grouped permissions not available */}
            {!permissions?.grouped && permissions && permissions.length > 0 && (
              <div className="space-y-2">
                {permissions.map((permission: any) => (
                  <FormField
                    key={permission.id}
                    control={form}
                    name="permissions"
                    value={permission.id}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Checkbox
                            checked={field.value.includes(permission.id)}
                            onValueChange={(value) => {
                              const current = field.value || [];
                              const index = current.indexOf(permission.id);
                              if (value && index === -1) {
                                field.onValueChange([...current, permission.id]);
                              } else if (!value && index !== -1) {
                                field.onValueChange(
                                  current.filter((id: number) => id !== permission.id)
                                );
                              }
                            }}
                            className="checkbox checkbox-primary"
                          />
                          <span className="ml-2">{permission.display_name}</span>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}

            {/* No permissions available */}
            {!permissions || permissions.length === 0 && (
              <p className="text-muted-foreground">No permissions available to assign.</p>
            )}
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <Button type="button" onClick={() => reset()} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Create Role
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}