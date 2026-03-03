import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Save, Loader2 } from 'lucide-react';
import { api, GlobalSettings } from '@/lib/api';
import { toast } from 'sonner';

interface SystemConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SystemConfigDialog({ open, onOpenChange }: SystemConfigDialogProps) {
    const [config, setConfig] = useState({
        schoolName: '',
        contactEmail: 'admin@school.edu',
        maintenanceMode: false,
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            void loadConfig();
        }
    }, [open]);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const settings = await api.settings.get() as GlobalSettings;
            setConfig({
                schoolName: settings.site_name || '',
                contactEmail: settings.support_email || '',
                maintenanceMode: Boolean(settings.maintenance_mode),
            });
        } catch (error) {
            console.error('Failed to load system configuration:', error);
            toast.error('Failed to load system configuration.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.settings.update({
                site_name: config.schoolName,
                support_email: config.contactEmail,
                maintenance_mode: config.maintenanceMode,
            });
            toast.success('System configuration saved successfully.');
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save system configuration:', error);
            toast.error('Failed to save system configuration.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-600" />
                        System Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Manage global settings for your educational tenant.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">School Name</Label>
                        <Input
                            id="name"
                            value={config.schoolName}
                            onChange={(e) => setConfig({ ...config, schoolName: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Support Email</Label>
                        <Input
                            id="email"
                            value={config.contactEmail}
                            onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">System Status</Label>
                        <div className="col-span-3 flex items-center space-x-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${config.maintenanceMode ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                            <span className="text-sm text-slate-600">{config.maintenanceMode ? 'Maintenance Mode' : 'Operational'}</span>
                            <Switch
                                checked={config.maintenanceMode}
                                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, maintenanceMode: checked }))}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700" disabled={loading || saving}>
                        {loading || saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
