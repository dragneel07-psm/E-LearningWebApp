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
    admin_password: string;
    admin_username: string;
};

export function CreateSchoolDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [subdomain, setSubdomain] = useState("");
    const [adminUsername, setAdminUsername] = useState("admin");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !subdomain || !adminEmail || !adminPassword) {
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
                admin_password: adminPassword,
                admin_username: adminUsername
            };
            await coreAPI.createTenant(payload);

            toast.success("School created successfully!");
            setOpen(false);

            // Wait for potential dev server reload (SQLite file creation triggers it)
            setTimeout(() => {
                onCreated();
            }, 1000);

            // Reset form
            setName("");
            setSubdomain("");
            setAdminEmail("");
            setAdminPassword("");
            setAdminUsername("admin");
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
                                Subdomain
                            </Label>
                            <Input
                                id="subdomain"
                                value={subdomain}
                                onChange={(e) => setSubdomain(e.target.value)}
                                className="col-span-3"
                                placeholder="greenwood"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="adminUsername" className="text-right">
                                Admin Username
                            </Label>
                            <Input
                                id="adminUsername"
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value)}
                                className="col-span-3"
                                placeholder="admin"
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
