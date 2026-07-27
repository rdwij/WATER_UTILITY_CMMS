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

export default function PermissionsShow() {
  const { data: permission } = usePage().props;

  return (
    <>
      <Head title={`Permission: ${permission.display_name}`} />
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{permission.display_name}</h1>
          <p className="text-muted-foreground mt-2">
            Permission: {permission.name}
          </p>
          {permission.description && (
            <p className="mt-2">{permission.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-4">
            <Link
              href={route('permissions.edit', permission.id)}
              className="btn btn-sm btn-outline"
            >
              Edit Permission
            </Link>
            <Button
              onClick={() => {
                if (
                  window.confirm(
                    `Are you sure you want to delete the ${permission.display_name} permission?`
                  )
                ) {
                  window.location.href = route('permissions.destroy', permission.id);
                }
              }}
              variant="destructive"
              size="sm"
            >
              Delete Permission
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Permission Overview */}
          <Card>
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold">Permission Overview</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Basic Information
                  </h3>
                  <p className="mt-1">
                    <strong>Name:</strong> {permission.name}
                  </p>
                  <p className="mt-1">
                    <strong>Display Name:</strong> {permission.display_name}
                  </p>
                  <p className="mt-1">
                    <strong>Module/Group:</strong> {permission.group}
                  </p>
                  <p className="mt-1">
                    <strong>Status:</strong>
                    <Badge
                      variant={permission.is_active ? 'default' : 'destructive'}
                    >
                      {permission.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Description
                  </h3>
                  <p className="mt-1">
                    {permission.description || 'No description provided'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Timestamps
                  </h3>
                  <p className="mt-1">
                    <strong>Created:</strong> {permission.created_at ? new Date(permission.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                  <p className="mt-1">
                    <strong>Updated:</strong> {permission.updated_at ? new Date(permission.updated_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Roles with this permission */}
          {permission.roles && permission.roles.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <h2 className="text-lg font-semibold">
                  Roles ({permission.roles.length})
                </h2>
              </CardHeader>
              <CardContent>
                {permission.roles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role Name</TableHead>
                        <TableHead>Display Name</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {permission.roles.map((role: any) => (
                        <TableRow key={role.id}>
                          <TableCell>{role.name}</TableCell>
                          <TableCell>{role.display_name}</TableCell>
                          <TableCell>{role.description || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-4 text-muted-foreground">
                    No roles assigned to this permission.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}