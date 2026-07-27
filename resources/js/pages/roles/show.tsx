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

export default function RolesShow() {
  const { data: role } = usePage().props;

  return (
    <>
      <Head title={`Role: ${role.display_name}`} />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{role.display_name}</h1>
          <p className="text-muted-foreground mt-2">
            Role: {role.name}
          </p>
          {role.description && (
            <p className="mt-2">{role.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={route('roles.edit', role.id)}
              className="btn btn-sm btn-outline"
            >
              Edit Role
            </Link>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete the ${role.display_name} role?`
                  )
                ) {
                  window.location.href = route('roles.destroy', role.id);
                }
              }}
              variant="destructive"
              size="sm"
            >
              Delete Role
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Users with this role */}
          {role.users && role.users.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">
                  Users ({role.users.length})
                </h2>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {role.users.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Link href={route('users.show', user.id)}>
                            {user.name}
                          </Link>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.employee ? (
                            <span className="font-mono">
                              {user.employee.employee_id}
                            </span>
                          ) : (
                            <span className="text-muted-italic">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={route('users.show', user.id)}
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

          {/* Permissions */}
          {role.permissions && role.permissions.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">
                  Permissions ({role.permissions.length})
                </h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {role.permissions.grouped && Object.keys(role.permissions.grouped).map((group) => (
                    <div key={group}>
                      <h3 className="text-lg font-medium mb-4">{group}</h3>
                      <div className="space-y-1">
                        {role.permissions.grouped[group].map((permission: any) => (
                          <span
                            key={permission.id}
                            className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary"
                          >
                            {permission.display_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Fallback if grouped permissions not available */}
                  {!role.permissions?.grouped && role.permissions && role.permissions.length > 0 && (
                    <div className="space-y-2">
                      {role.permissions.map((permission: any) => (
                        <span
                          key={permission.id}
                          className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary"
                        >
                          {permission.display_name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* No permissions */}
                  {!role.permissions || role.permissions.length === 0 && (
                    <p className="text-muted-foreground">No permissions assigned to this role.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}