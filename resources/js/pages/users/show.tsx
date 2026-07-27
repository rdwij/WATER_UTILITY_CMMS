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

export default function UsersShow() {
  const { data: user } = usePage().props;

  return (
    <>
      <Head title={`User: ${user.name}`} />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground mt-2">
            Email: {user.email}
          </p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={route('users.edit', user.id)}
              className="btn btn-sm btn-outline"
            >
              Edit User
            </Link>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete ${user.name}?`
                  )
                ) {
                  window.location.href = route('users.destroy', user.id);
                }
              }}
              variant="destructive"
              size="sm"
            >
              Delete User
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Overview */}
          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold">User Overview</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Account Information
                  </h3>
                  <p className="mt-1">
                    <Badge
                      variant={user.email_verified_at ? 'default' : 'secondary'}
                    >
                      {user.email_verified_at ? 'Verified' : 'Unverified'}
                    </Badge>
                  </p>
                  <p className="mt-1">Member since: {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Contact Information
                  </h3>
                  <p className="mt-1">{user.phone_number || 'Not provided'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Notification Preferences
                  </h3>
                  <p className="mt-1">
                    <Badge variant="secondary">
                      Dashboard: {user.dashboard_notifications ? 'On' : 'Off'}
                    </Badge>
                  </p>
                  <p className="mt-1">
                    <Badge variant="secondary">
                      Email: {user.email_notifications ? 'On' : 'Off'}
                    </Badge>
                  </p>
                  <p className="mt-1">
                    <Badge variant="secondary">
                      SMS: {user.sms_notifications ? 'On' : 'Off'}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles */}
          {user.roles && user.roles.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Assigned Roles ({user.roles.length})</h2>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.roles.map((role: any) => (
                    <span key={role.id} className="badge secondary">
                      {role.display_name}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employee Information */}
          {user.employee && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">Employee Information</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Employee Details
                      </h3>
                      <p className="mt-1">Employee ID: {user.employee.employee_id}</p>
                      <p className="mt-1">Position: {user.employee.position_title}</p>
                      <p className="mt-1">Department: {user.employee.department}</p>
                      <p className="mt-1">
                        Status:
                        <Badge
                          variant={user.employee.employment_status === 'active' ? 'default' : 'destructive'}
                        >
                          {user.employee.employment_status.charAt(0).toUpperCase() + user.employee.employment_status.slice(1).replace('_', ' ')}
                        </Badge>
                      </p>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Employment Dates
                      </h3>
                      <p className="mt-1">
                        Hire Date: {user.employee.hire_date ? new Date(user.employee.hire_date).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="mt-1">
                        Termination Date: {user.employee.termination_date ? new Date(user.employee.termination_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Contact Information</h3>
                    <p className="mb-1">Phone: {user.employee.phone_number || 'Not provided'}</p>
                    <p className="mb-1">
                      Emergency Contact: {user.employee.emergency_contact || 'Not provided'}
                    </p>
                    <p className="mb-1">
                      Emergency Phone: {user.employee.emergency_phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subordinates (if user is a supervisor) */}
          {user.employee?.subordinates && user.employee.subordinates.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">
                  Subordinates ({user.employee.subordinates.length})
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
                    {user.employee.subordinates.map((sub: any) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          <Link href={route('users.show', sub.user.id)}>
                            {sub.first_name} {sub.last_name}
                          </Link>
                        </TableCell>
                        <TableCell>{sub.employee_id}</TableCell>
                        <TableCell>{sub.position_title}</TableCell>
                        <TableCell>{sub.department}</TableCell>
                        <TableCell>
                          <Link
                            href={route('users.show', sub.user.id)}
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
        </div>
      </div>
    </>
  );
}