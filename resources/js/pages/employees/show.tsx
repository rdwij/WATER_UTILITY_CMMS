import { Head } from '@inertiajs/react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui';
import { HiOutlineUserGroup, Icon } from '@heroicons/react/24/solid';
import { Link } from '@inertiajs/react';

export default function EmployeesShow() {
  const { data: employee } = usePage().props;

  return (
    <>
      <Head title={`Employee: ${employee.first_name} ${employee.last_name}`} />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            {employee.first_name} {employee.last_name}
          </h1>
          <p className="text-muted-foreground mt-2">
            Employee ID: {employee.employee_id}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={route('employees.edit', employee.id)}
              className="btn btn-sm btn-outline"
            >
              Edit Employee
            </Link>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${employee.first_name} ${employee.last_name}?`
                  )
                ) {
                  window.location.href = route('employees.destroy', employee.id);
                }
              }}
              variant="destructive"
              size="sm"
            >
              Delete Employee
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Employee Overview */}
          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold">Employee Overview</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    User Information
                  </h3>
                  <p className="mt-1">
                    {employee.user?.name || 'No user account'}
                  </p>
                  {employee.user?.email && (
                    <p className="mt-1">{employee.user?.email}</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Position & Department
                  </h3>
                  <p className="mt-1">{employee.position_title}</p>
                  <p className="mt-1">{employee.department}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Employment Status
                  </h3>
                  <p className="mt-1">
                    <Badge
                      variant={employee.employment_status === 'active' ? 'default' : 'destructive'}
                    >
                      {employee.employment_status.charAt(0).toUpperCase() + employee.employment_status.slice(1)}
                    </Badge>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Hire Date
                  </h3>
                  <p className="mt-1">
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Supervisor
                  </h3>
                  <p className="mt-1">
                    {employee.supervisor?.user?.name || 'None'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact Information
                  </h3>
                  <p className="mt-1">{employee.phone_number || 'Not provided'}</p>
                  <p className="mt-1">
                    Emergency: {employee.emergency_contact || 'Not provided'}
                  </p>
                  <p className="mt-1">
                    Phone: {employee.emergency_phone || 'Not provided'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subordinates */}
          {employee.subordinates && employee.subordinates.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">
                  Subordinates ({employee.subordinates.length})
                </h2>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employee.subordinates.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <Link href={route('employees.show', sub.id)}>
                            {sub.first_name} {sub.last_name}
                          </Link>
                        </TableCell>
                        <TableCell>{sub.employee_id}</TableCell>
                        <TableCell>{sub.position_title}</TableCell>
                        <TableCell>{sub.department}</TableCell>
                        <TableCell>
                          <Link
                            href={route('employees.show', sub.id)}
                            className="btn btn-sm btn-outline"
                          >
                            View
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Additional Information */}
          {(
            employee.certifications ||
            employee.training_records ||
            employee.notes
          ) && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Additional Information</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {employee.certifications && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Certifications
                    </h3>
                    <p className="mt-1">{employee.certifications}</p>
                  </div>
                )}

                {employee.training_records && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Training Records
                    </h3>
                    <p className="mt-1">{employee.training_records}</p>
                  </div>
                )}

                {employee.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Notes
                    </h3>
                    <p className="mt-1">{employee.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}