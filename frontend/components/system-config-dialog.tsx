import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';

interface SystemConfigDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SystemConfigDialog({ open, onOpenChange }: SystemConfigDialogProps) {
    const [config, setConfig] = useState({
        schoolName: 'E-Learning Academy',
        currentTerm: 'Fall 2024',
        contactEmail: 'admin@school.edu',
        maintenanceMode: false
    });

    const handleSave = () => {
        // In a real app, this would PUT to /api/tenant/config
        // For now, we simulate a save
        localStorage.setItem('school_config', JSON.stringify(config));
        onOpenChange(false);
        alert('System configuration saved successfully.');
        window.location.reload(); // To reflect potential title changes if we were using context
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
                        <Label htmlFor="term" className="text-right">Current Term</Label>
                        <Input
                            id="term"
                            value={config.currentTerm}
                            onChange={(e) => setConfig({ ...config, currentTerm: e.target.value })}
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
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
