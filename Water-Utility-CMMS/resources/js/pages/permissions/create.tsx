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
  Input,
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

export default function PermissionsCreate() {
  const { data, post, processing, errors, reset } = useForm({
    name: '',
    display_name: '',
    description: '',
    group: '',
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('permissions.store'), {
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
      <Head title="Create Permission" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Permission</h1>
          <p className="text-muted-foreground">
            Define a new permission for access control
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
                  <FormLabel>Permission Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., users.view"
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
                      placeholder="e.g., View Users"
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
                      placeholder="Describe what this permission allows"
                      className="w-full h-24"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="group"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module/Group</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select module" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="users">Users</SelectItem>
                        <SelectItem value="employees">Employees</SelectItem>
                        <SelectItem value="roles">Roles</SelectItem>
                        <SelectItem value="permissions">Permissions</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="reports">Reports</SelectItem>
                        <SelectItem value="settings">Settings</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="is_active"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <FormControl>
                    <Checkbox
                      {...field}
                      className="checkbox checkbox-primary"
                    />
                    <span className="ml-2">Active</span>
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
              Create Permission
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}