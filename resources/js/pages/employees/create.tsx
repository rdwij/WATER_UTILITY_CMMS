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
  Textarea,
  Input,
  InputGroup,
  InputIndicator,
  Separator,
} from '@/components/ui';
import { useForm } from '@inertiajs/react';
import { useState } from 'react';
import { HiOutlineUserGroup, Icon } from '@heroicons/react/24/solid';

export default function EmployeesCreate() {
  const { data, post, processing, errors, reset } = useForm({
    user_id: '',
    employee_id: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    phone_number: '',
    emergency_contact: '',
    emergency_phone: '',
    position_title: '',
    department: '',
    hire_date: '',
    termination_date: '',
    employment_status: 'active',
    supervisor_id: '',
    certifications: '',
    training_records: '',
    notes: '',
  });

  const { data: users } = usePage().props;
  const { data: supervisors } = usePage().props;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('employees.store'), {
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
      <Head title="Create Employee" />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create Employee</h1>
          <p className="text-muted-foreground">
            Add a new employee to the system
          </p>
        </div>

        <Form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Information Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Employee Information</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="employee_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee ID</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="EMP001"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="John"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Doe"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="middle_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Middle Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Middle"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form}
              name="phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="+1 (555) 123-4567"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          {/* Emergency Contact Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Emergency Contact</h2>
            <Separator className="mb-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="emergency_contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Contact Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Jane Doe"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="emergency_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency Phone</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="+1 (555) 987-6543"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Employment Details Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Employment Details</h2>
            <Separator className="mb-4" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="position_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position Title</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Water Technician"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Water Distribution"
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form}
                name="hire_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />

              <FormField
                control={form}
                name="employment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment Status</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                          <SelectItem value="on_leave">On Leave</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage>{field.error}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form}
              name="supervisor_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {supervisors.map((supervisor: any) => (
                          <SelectItem
                            key={supervisor.id}
                            value={supervisor.id}
                          >
                            {supervisor.user?.name} ({supervisor.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          {/* Additional Information Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Additional Information</h2>
            <Separator className="mb-4" />

            <FormField
              control={form}
              name="certifications"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certifications</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="List any relevant certifications"
                      className="w-full h-24"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="training_records"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Training Records</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="List any training records"
                      className="w-full h-24"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={form}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Any additional notes"
                      className="w-full h-24"
                    />
                  </FormControl>
                  <FormMessage>{field.error}</FormMessage>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <Button type="button" onClick={() => reset()} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Create Employee
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}