<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

use Illuminate\Support\Facades\Mail;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = User::query();

        // Search filter
        if ($request->has('search') && !empty($request->input('search'))) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('dni', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        // Sorting
        $sortBy = $request->input('sort_by', 'name');
        $allowedSorts = ['name', 'email', 'dni', 'role'];
        if (!in_array($sortBy, $allowedSorts)) {
            $sortBy = 'name';
        }

        $sortDir = $request->input('sort_dir', 'asc');
        if (!in_array(strtolower($sortDir), ['asc', 'desc'])) {
            $sortDir = 'asc';
        }

        $query->orderBy($sortBy, $sortDir);

        // We can optionally support pagination, but to match platformService.loadUsers() loading all users:
        // if requested without pagination, we can return all. Let's return all users to match the current signal design,
        // or check if paginated is requested. If the frontend loads all users at once, returning a plain list is perfect!
        // Let's support both: if 'all' parameter is present, or by default, return the complete list.
        $users = $query->get();

        return response()->json($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email',
            'dni' => 'required|string|max:20|unique:users,dni',
            'role' => ['required', 'string', Rule::in(['Administrador', 'Caja', 'Formación Continua', 'Investigación'])],
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $rawPassword = $request->password;
        $data = $request->all();
        $data['password'] = Hash::make($rawPassword);

        $user = User::create($data);

        // Enviar correo con diseño moderno
        try {
            $name = $user->name;
            $email = $user->email;
            $role = $user->role;
            
            $htmlContent = "
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset='utf-8'>
                <title>Credenciales de Acceso</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background-color: #0b0f19;
                        color: #f1f5f9;
                        margin: 0;
                        padding: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 40px auto;
                        background: linear-gradient(145deg, #111827, #0f172a);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 24px;
                        overflow: hidden;
                        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.5);
                    }
                    .header {
                        background: linear-gradient(135deg, #881337 0%, #4c0519 100%);
                        padding: 40px 20px;
                        text-align: center;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .logo {
                        font-size: 32px;
                        margin-bottom: 10px;
                    }
                    .title {
                        color: #ffffff;
                        font-size: 24px;
                        font-weight: 800;
                        margin: 0;
                        letter-spacing: -0.5px;
                    }
                    .subtitle {
                        color: #fda4af;
                        font-size: 14px;
                        font-weight: 500;
                        margin-top: 5px;
                        margin-bottom: 0;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .content {
                        padding: 40px 30px;
                    }
                    .welcome {
                        font-size: 16px;
                        line-height: 1.6;
                        color: #cbd5e1;
                        margin-bottom: 25px;
                    }
                    .cred-card {
                        background-color: rgba(255, 255, 255, 0.03);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 16px;
                        padding: 24px;
                        margin-bottom: 30px;
                    }
                    .cred-row {
                        margin-bottom: 16px;
                    }
                    .cred-row:last-child {
                        margin-bottom: 0;
                    }
                    .label {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #94a3b8;
                        letter-spacing: 1.5px;
                        margin-bottom: 6px;
                    }
                    .value {
                        font-size: 15px;
                        color: #ffffff;
                        font-weight: 600;
                    }
                    .value-mono {
                        font-family: 'Consolas', 'Courier New', monospace;
                        font-size: 16px;
                        color: #fbbf24;
                        background-color: rgba(0, 0, 0, 0.25);
                        padding: 6px 12px;
                        border-radius: 6px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        display: inline-block;
                    }
                    .role-tag {
                        background-color: rgba(245, 158, 11, 0.1);
                        color: #f59e0b;
                        border: 1px solid rgba(245, 158, 11, 0.2);
                        padding: 3px 10px;
                        border-radius: 9999px;
                        font-size: 12px;
                        font-weight: 700;
                        display: inline-block;
                    }
                    .button-container {
                        text-align: center;
                        margin-top: 35px;
                        margin-bottom: 15px;
                    }
                    .button {
                        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                        color: #0f172a !important;
                        text-decoration: none;
                        padding: 14px 32px;
                        font-size: 14px;
                        font-weight: 700;
                        border-radius: 12px;
                        display: inline-block;
                        box-shadow: 0 4px 14px 0 rgba(245, 158, 11, 0.3);
                    }
                    .footer {
                        padding: 24px 30px;
                        background-color: rgba(0, 0, 0, 0.2);
                        border-top: 1px solid rgba(255, 255, 255, 0.05);
                        text-align: center;
                        font-size: 11px;
                        color: #64748b;
                        line-height: 1.5;
                    }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <div class='logo'>🎓</div>
                        <h1 class='title'>IESTP Chojata</h1>
                        <p class='subtitle'>Plataforma Académica</p>
                    </div>
                    <div class='content'>
                        <p class='welcome'>
                            Estimado/a <strong>{$name}</strong>,<br><br>
                            Le damos una cordial bienvenida a la plataforma institucional del IESTP Chojata. Se ha creado su cuenta con los siguientes privilegios y accesos:
                        </p>
                        <div class='cred-card'>
                            <div class='cred-row'>
                                <div class='label'>Rol de Acceso</div>
                                <div class='role-tag'>{$role}</div>
                            </div>
                            <div class='cred-row' style='margin-top: 20px;'>
                                <div class='label'>Usuario / Correo</div>
                                <div class='value' style='font-family: monospace; font-size: 16px;'>{$email}</div>
                            </div>
                            <div class='cred-row'>
                                <div class='label'>Contraseña Temporal</div>
                                <div class='value-mono'>{$rawPassword}</div>
                            </div>
                        </div>
                        <p class='welcome' style='font-size: 13px; color: #94a3b8;'>
                            ⚠️ <em>Por motivos de seguridad, le recomendamos cambiar su contraseña en su primer inicio de sesión en la plataforma.</em>
                        </p>
                        <div class='button-container'>
                            <a href='http://localhost:4200/intranet' class='button'>Acceder a la Intranet</a>
                        </div>
                    </div>
                    <div class='footer'>
                        Este es un correo automático generado por el sistema de gestión académica de IESTP Chojata.<br>
                        Por favor no responda a este mensaje.<br>
                        &copy; 2026 IESTP Chojata. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
            ";

            Mail::send([], [], function ($message) use ($email, $htmlContent) {
                $message->to($email)
                        ->subject('🔑 Credenciales de Acceso - IESTP Chojata')
                        ->html($htmlContent);
            });
        } catch (\Exception $e) {
            logger()->error('Error enviando correo de credenciales: ' . $e->getMessage());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario creado con éxito.',
            'data' => $user
        ], 201);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $email)
    {
        $user = User::where('email', $email)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'dni' => ['required', 'string', 'max:20', Rule::unique('users', 'dni')->ignore($user->id)],
            'role' => ['required', 'string', Rule::in(['Administrador', 'Caja', 'Formación Continua', 'Investigación'])],
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->only(['name', 'email', 'dni', 'role']);
        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario actualizado con éxito.',
            'data' => $user
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($email)
    {
        $user = User::where('email', $email)->firstOrFail();
        
        // Prevent deleting the primary admin for safety
        if ($user->email === 'admin@institucion.edu') {
            return response()->json([
                'status' => 'error',
                'message' => 'No se puede eliminar al administrador principal del sistema.'
            ], 403);
        }

        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Usuario eliminado con éxito.'
        ]);
    }
}
