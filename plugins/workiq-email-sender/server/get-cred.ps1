# Reads the WorkIQ-Gmail credential from Windows Credential Manager.
# Outputs: user|password

Add-Type -Namespace Win32 -Name Cred -MemberDefinition @'
  [DllImport("advapi32.dll", SetLastError=true, CharSet=CharSet.Unicode)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);

  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags;
    public int Type;
    public string TargetName;
    public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize;
    public IntPtr CredentialBlob;
    public int Persist;
    public int AttributeCount;
    public IntPtr Attributes;
    public string TargetAlias;
    public string UserName;
  }
'@

$ptr = [IntPtr]::Zero
if ([Win32.Cred]::CredRead('WorkIQ-Gmail', 1, 0, [ref]$ptr)) {
    $c = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [Type][Win32.Cred+CREDENTIAL])
    $pass = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($c.CredentialBlob, $c.CredentialBlobSize / 2)
    [Win32.Cred]::CredFree($ptr)
    Write-Output "$($c.UserName)|$pass"
} else {
    throw "Credential 'WorkIQ-Gmail' not found in Windows Credential Manager."
}
