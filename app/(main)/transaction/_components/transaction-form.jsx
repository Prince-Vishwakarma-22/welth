"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "@/actions/transaction";
import { transactionSchema } from "@/app/lib/schema";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({
    accounts,
    categories,
    editMode = false,
    initialData = null,
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams.get("edit");

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        getValues,
        reset,
    } = useForm({
        resolver: zodResolver(transactionSchema),
        defaultValues: editMode && initialData
            ? {
                type: initialData.type,
                amount: initialData.amount.toString(),
                description: initialData.description,
                accountId: initialData.accountId,
                category: initialData.category,
                date: new Date(initialData.date),
                isRecurring: initialData.isRecurring,
                ...(initialData.recurringInterval && {
                    recurringInterval: initialData.recurringInterval,
                }),
            }
            : {
                type: "EXPENSE",
                amount: "",
                description: "",
                accountId: accounts.find((ac) => ac.isDefault)?.id,
                date: new Date(),
                isRecurring: false,
            },
    });

    const {
        loading: transactionLoading,
        fn: transactionFn,
        data: transactionResult,
    } = useFetch(editMode ? updateTransaction : createTransaction);

    const onSubmit = (data) => {
        const formData = {
            ...data,
            amount: parseFloat(data.amount),
        };

        if (editMode) {
            transactionFn(editId, formData);
        } else {
            transactionFn(formData);
        }
    };

    const handleScanComplete = (scannedData) => {
        if (scannedData) {
            setValue("amount", scannedData.amount.toString());
            setValue("date", new Date(scannedData.date));
            if (scannedData.description) {
                setValue("description", scannedData.description);
            }
            if (scannedData.category) {
                setValue("category", scannedData.category);
            }
            toast.success("Receipt scanned successfully");
        }
    };

    useEffect(() => {
        if (transactionResult?.success && !transactionLoading) {
            toast.success(
                editMode ? "Transaction updated successfully" : "Transaction created successfully"
            );
            reset();
            router.push(`/account/${transactionResult.data.accountId}`);
        }
    }, [transactionResult, transactionLoading, editMode]);

    const type = watch("type");
    const isRecurring = watch("isRecurring");
    const date = watch("date");

    const filteredCategories = categories.filter((category) => category.type === type);

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
                <h1 className="text-3xl font-bold text-center text-primary mb-6">
                    {editMode ? "Edit Transaction" : "Add Transaction"}
                </h1>

                {!editMode && (
                    <div className="text-center mb-6">
                        <ReceiptScanner onScanComplete={handleScanComplete} />
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Type */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <Select onValueChange={(value) => setValue("type", value)} defaultValue={type}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="EXPENSE">Expense</SelectItem>
                                <SelectItem value="INCOME">Income</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
                    </div>

                    {/* Amount & Account */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <Input type="number" step="0.01" placeholder="0.00" {...register("amount")} />
                            {errors.amount && <p className="text-sm text-red-500">{errors.amount.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Account</label>
                            <Select
                                onValueChange={(value) => setValue("accountId", value)}
                                defaultValue={getValues("accountId")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map((account) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.name} (${parseFloat(account.balance).toFixed(2)})
                                        </SelectItem>
                                    ))}
                                    <CreateAccountDrawer>
                                        <Button variant="ghost" className="w-full text-left text-sm">
                                            + Create Account
                                        </Button>
                                    </CreateAccountDrawer>
                                </SelectContent>
                            </Select>
                            {errors.accountId && (
                                <p className="text-sm text-red-500">{errors.accountId.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <Select
                            onValueChange={(value) => setValue("category", value)}
                            defaultValue={getValues("category")}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredCategories.map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.category && (
                            <p className="text-sm text-red-500">{errors.category.message}</p>
                        )}
                    </div>

                    {/* Date */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={(date) => setValue("date", date)}
                                    disabled={(date) =>
                                        date > new Date() || date < new Date("1900-01-01")
                                    }
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        {errors.date && <p className="text-sm text-red-500">{errors.date.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">Description</label>
                        <Input placeholder="Enter description" {...register("description")} />
                        {errors.description && (
                            <p className="text-sm text-red-500">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Recurring */}
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                        <div>
                            <label className="text-sm font-medium text-gray-700">Recurring Transaction</label>
                            <p className="text-xs text-muted-foreground">
                                Set up a recurring schedule for this transaction
                            </p>
                        </div>
                        <Switch
                            checked={isRecurring}
                            onCheckedChange={(checked) => setValue("isRecurring", checked)}
                        />
                    </div>

                    {/* Recurring Interval */}
                    {isRecurring && (
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Recurring Interval</label>
                            <Select
                                onValueChange={(value) => setValue("recurringInterval", value)}
                                defaultValue={getValues("recurringInterval")}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select interval" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DAILY">Daily</SelectItem>
                                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    <SelectItem value="YEARLY">Yearly</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.recurringInterval && (
                                <p className="text-sm text-red-500">{errors.recurringInterval.message}</p>
                            )}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-4 justify-end pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-1/2"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" className="w-1/2" disabled={transactionLoading}>
                            {transactionLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {editMode ? "Updating..." : "Creating..."}
                                </>
                            ) : editMode ? (
                                "Update Transaction"
                            ) : (
                                "Create Transaction"
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
