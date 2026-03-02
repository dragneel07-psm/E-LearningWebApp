import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { coreAPI } from "@/lib/api";

type CreateTenantPayload = Parameters<typeof coreAPI.createTenant>[0] & {
    admin_email: string;
    password: string;
    admin_first_name: string;
    admin_last_name: string;
};

export function CreateSchoolDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [subdomain, setSubdomain] = useState("");
    const [adminFirstName, setAdminFirstName] = useState("");
    const [adminLastName, setAdminLastName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !subdomain || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setLoading(true);
        try {
            const payload: CreateTenantPayload = {
                name,
                subdomain,
                type: 'standard', // Default Plan
                status: 'active',
                admin_email: adminEmail,
                password: adminPassword,
                admin_first_name: adminFirstName,
                admin_last_name: adminLastName,
            };
            await coreAPI.createTenant(payload);

            toast.success("School created successfully!");
            setOpen(false);

            // Notify parent to refresh list immediately
            onCreated();

            // Reset form
            setName("");
            setSubdomain("");
            setAdminEmail("");
            setAdminPassword("");
            setAdminFirstName("");
            setAdminLastName("");
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : "Failed to create school.";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Onboard New School
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Onboard New School</DialogTitle>
                    <DialogDescription>
                        Create a tenant and provision the first admin user.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                School Name
                            </Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                placeholder="Greenwood High"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="subdomain" className="text-right">
                                School Code
                            </Label>
                            <div className="col-span-3 space-y-1">
                                <Input
                                    id="subdomain"
                                    value={subdomain}
                                    onChange={(e) => setSubdomain(e.target.value)}
                                    placeholder="e.g. greenwood"
                                />
                                <p className="text-[10px] text-slate-500">
                                    This will be used for logins (e.g. greenwood.domain.com)
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="adminFirstName" className="text-right"> Admin First Name </Label>
                            <Input
                                id="adminFirstName"
                                value={adminFirstName}
                                onChange={(e) => setAdminFirstName(e.target.value)}
                                className="col-span-3"
                                placeholder="John"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="adminLastName" className="text-right"> Admin Last Name </Label>
                            <Input
                                id="adminLastName"
                                value={adminLastName}
                                onChange={(e) => setAdminLastName(e.target.value)}
                                className="col-span-3"
                                placeholder="Doe"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="email" className="text-right">
                                Admin Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="col-span-3"
                                placeholder="admin@greenwood.edu"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="password" className="text-right">
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="col-span-3"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Provisioning...
                                </>
                            ) : (
                                "Create School"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
